// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title SafeExternalCalls
 * @dev Library for safe external call handling with proper error management
 */
library SafeExternalCalls {

    // Custom errors for better debugging
    error ExternalCallFailed(address target, uint256 value, bytes data);
    error InsufficientGas(uint256 required, uint256 available);
    error TransferFailed(address recipient, uint256 amount);
    error ReentrancyDetected();

    // Gas limits for different operations
    uint256 private constant STANDARD_TRANSFER_GAS = 50000;
    uint256 private constant TOKEN_TRANSFER_GAS = 100000;
    uint256 private constant ERC20_TRANSFER_GAS = 80000;
    uint256 private constant EMERGENCY_TRANSFER_GAS = 100000;

    /**
     * @dev Safe ETH transfer with proper error handling
     * @param recipient Address to send ETH to
     * @param amount Amount of ETH to send
     * @param gasLimit Maximum gas to use for the transfer
     * @return success Whether the transfer succeeded
     */
    function safeTransferETH(
        address payable recipient,
        uint256 amount,
        uint256 gasLimit
    ) internal returns (bool) {
        if (amount == 0) return true;
        if (address(this).balance < amount) return false;
        if (recipient == address(0)) return false;

        // Check if enough gas is available
        if (gasleft() < gasLimit) revert InsufficientGas(gasLimit, gasleft());

        (bool success, bytes memory returnData) = recipient.call{
            value: amount,
            gas: gasLimit
        }("");

        if (!success) {
            // Emit custom error with detailed information
            revert ExternalCallFailed(recipient, amount, returnData);
        }

        return success;
    }

    /**
     * @dev Safe ETH transfer with standard gas limit
     */
    function safeTransferETH(address payable recipient, uint256 amount) internal returns (bool) {
        return safeTransferETH(recipient, amount, STANDARD_TRANSFER_GAS);
    }

    /**
     * @dev Safe ERC20 token transfer with proper error handling
     * @param token Token contract address
     * @param recipient Address to receive tokens
     * @param amount Amount of tokens to transfer
     * @return success Whether the transfer succeeded
     */
    function safeTransferToken(
        address token,
        address recipient,
        uint256 amount
    ) internal returns (bool) {
        if (amount == 0) return true;
        if (token == address(0)) return false;
        if (recipient == address(0)) return false;

        // Check available gas
        if (gasleft() < ERC20_TRANSFER_GAS) revert InsufficientGas(ERC20_TRANSFER_GAS, gasleft());

        // Prepare call data for transfer(address,uint256)
        bytes memory callData = abi.encodeWithSignature(
            "transfer(address,uint256)",
            recipient,
            amount
        );

        (bool success, bytes memory returnData) = token.call{
            gas: ERC20_TRANSFER_GAS
        }(callData);

        if (!success) {
            revert ExternalCallFailed(token, 0, returnData);
        }

        // Check return data for boolean success (some ERC20 tokens return false on failure)
        if (returnData.length > 0) {
            return abi.decode(returnData, (bool));
        }

        // If no return data, assume success (pre-0.4.22 tokens)
        return true;
    }

    /**
     * @dev Safe ERC20 token transferFrom with proper error handling
     * @param token Token contract address
     * @param from Address to transfer from
     * @param to Address to transfer to
     * @param amount Amount of tokens to transfer
     * @return success Whether the transfer succeeded
     */
    function safeTransferFrom(
        address token,
        address from,
        address to,
        uint256 amount
    ) internal returns (bool) {
        if (amount == 0) return true;
        if (token == address(0)) return false;
        if (from == address(0) || to == address(0)) return false;

        if (gasleft() < ERC20_TRANSFER_GAS) revert InsufficientGas(ERC20_TRANSFER_GAS, gasleft());

        bytes memory callData = abi.encodeWithSignature(
            "transferFrom(address,address,uint256)",
            from,
            to,
            amount
        );

        (bool success, bytes memory returnData) = token.call{
            gas: ERC20_TRANSFER_GAS
        }(callData);

        if (!success) {
            revert ExternalCallFailed(token, 0, returnData);
        }

        if (returnData.length > 0) {
            return abi.decode(returnData, (bool));
        }

        return true;
    }

    /**
     * @dev Batch ETH transfers with individual gas limits
     * @param recipients Array of addresses to send ETH to
     * @param amounts Array of amounts to send
     * @return successCount Number of successful transfers
     * @return failedIndices Indices of failed transfers
     */
    function batchTransferETH(
        address payable[] memory recipients,
        uint256[] memory amounts
    ) internal returns (uint256 successCount, uint256[] memory failedIndices) {
        require(recipients.length == amounts.length, "Array length mismatch");

        uint256[] memory failed = new uint256[](recipients.length);
        uint256 failedCount = 0;
        successCount = 0;

        for (uint256 i = 0; i < recipients.length; i++) {
            if (safeTransferETH(recipients[i], amounts[i])) {
                successCount++;
            } else {
                failed[failedCount] = i;
                failedCount++;
            }
        }

        // Resize failedIndices array
        failedIndices = new uint256[](failedCount);
        for (uint256 i = 0; i < failedCount; i++) {
            failedIndices[i] = failed[i];
        }

        return (successCount, failedIndices);
    }

    /**
     * @dev Check if address is a contract
     * @param target Address to check
     * @return isContract Whether the address is a contract
     */
    function isContract(address target) internal view returns (bool) {
        return target.code.length > 0;
    }

    /**
     * @dev Get function selector from call data
     * @param callData Call data to extract selector from
     * @return selector Function selector (first 4 bytes)
     */
    function getSelector(bytes memory callData) internal pure returns (bytes4 selector) {
        if (callData.length >= 4) {
            assembly {
                selector := mload(add(callData, 0x20))
            }
        }
    }

    /**
     * @dev Emergency transfer with higher gas limit
     * @param recipient Address to send ETH to
     * @param amount Amount to send
     * @return success Whether transfer succeeded
     */
    function emergencyTransferETH(
        address payable recipient,
        uint256 amount
    ) internal returns (bool) {
        return safeTransferETH(recipient, amount, EMERGENCY_TRANSFER_GAS);
    }

    /**
     * @dev Validate external call result
     * @param success Boolean success flag
     * @param returnData Return data from external call
     * @param target Target address
     * @param context Context string for error reporting
     */
    function validateExternalCall(
        bool success,
        bytes memory returnData,
        address target,
        string memory context
    ) internal pure {
        if (!success) {
            revert ExternalCallFailed(target, 0, returnData);
        }

        // If return data exists, check for success indicators
        if (returnData.length > 0) {
            // Check if return data represents a boolean false
            if (returnData.length == 32) {
                uint256 result = abi.decode(returnData, (uint256));
                if (result == 0) {
                    revert TransferFailed(target, 0);
                }
            }
        }
    }

    /**
     * @dev Reentrancy protection for external calls
     * @param locked Boolean storage variable for reentrancy protection
     */
    modifier nonReentrantExternal(bool locked) {
        require(!locked, "Reentrancy detected");
        _;
    }
}